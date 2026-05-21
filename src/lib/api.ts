import { API_URL } from "./config";
import {
  beginAppRequest,
  endAppRequest,
  showApiErrorModal,
} from "./app-feedback";
import { clearSession } from "./auth";

type ApiOptions = RequestInit & {
  token?: string;
  showGlobalLoading?: boolean;
  showErrorModal?: boolean;
  errorTitle?: string;
};

type ApiErrorIssue = {
  path?: string;
  message?: string;
};

type ApiErrorBody = {
  message?: string;
  issues?: ApiErrorIssue[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const EXACT_ERROR_TRANSLATIONS: Record<string, string> = {
  "Request failed": "Yêu cầu không thành công.",
  "Failed to fetch": "Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend và kết nối mạng.",
  "Authentication required": "Bạn cần đăng nhập để tiếp tục.",
  "Group not found": "Không tìm thấy nhóm.",
  "You do not have access to this group": "Bạn không có quyền truy cập nhóm này.",
  "Only the owner can modify this group": "Chỉ chủ sở hữu mới có thể chỉnh sửa nhóm này.",
  "New password confirmation does not match": "Xác nhận mật khẩu mới không khớp.",
  "Email is already registered": "Email này đã được đăng ký.",
  "Invalid email or password": "Email hoặc mật khẩu không đúng.",
  "User not found": "Không tìm thấy người dùng.",
  "Current password is incorrect": "Mật khẩu hiện tại không đúng.",
  "New password must be different from the current password":
    "Mật khẩu mới phải khác mật khẩu hiện tại.",
  "A group can contain at most 20 players": "Một nhóm chỉ có thể có tối đa 20 thành viên.",
  "A group needs between 5 and 20 active players before creating a season":
    "Để tạo mùa giải, nhóm của bạn cần có từ 5 đến 20 thành viên ở trạng thái hoạt động.",
  "Finish the current season before creating a new one":
    "Hãy hoàn tất mùa giải hiện tại trước khi tạo mùa giải mới.",
  "Season not found": "Không tìm thấy mùa giải.",
  "Manual schedules support at most 12 participants":
    "Lịch thủ công chỉ hỗ trợ tối đa 12 người tham gia.",
  "Manual schedules require at least one match": "Lịch thủ công cần ít nhất 1 trận đấu.",
  "Season is locked": "Mùa giải này đã bị khóa.",
  "Participants must be unique": "Danh sách người tham gia không được trùng lặp.",
  "Participants must belong to the group":
    "Tất cả người tham gia phải thuộc nhóm này.",
  "Session not found": "Không tìm thấy buổi đấu.",
  "Results for this session have already been saved":
    "Kết quả của buổi đấu này đã được lưu trước đó.",
  "This session has no matches": "Buổi đấu này chưa có trận nào.",
  "You must submit results for all matches in the session":
    "Bạn cần nhập kết quả cho toàn bộ các trận trong buổi đấu.",
  "Duplicate match results are not allowed": "Không được gửi trùng kết quả trận đấu.",
  "One or more matches were not found in this session":
    "Có một hoặc nhiều trận không thuộc buổi đấu này.",
  "Draws are not supported by the current rules": "Luật hiện tại không hỗ trợ kết quả hòa.",
  "Invalid or expired token": "Phiên đăng nhập không còn hiệu lực hoặc đã hết hạn.",
  "Admin role required": "Bạn cần quyền quản trị để thực hiện thao tác này.",
  "Route not found": "Không tìm thấy đường dẫn yêu cầu.",
  "Validation failed": "Dữ liệu gửi lên chưa hợp lệ.",
  "Invalid identifier": "Định danh không hợp lệ.",
  "Internal server error": "Đã xảy ra lỗi máy chủ.",
  "At least 4 participants are required": "Cần ít nhất 4 người tham gia.",
  "Could not generate a fair match plan": "Không thể tạo lịch thi đấu cân bằng.",
  "A manual schedule requires at least 5 participants":
    "Lịch thủ công cần ít nhất 5 người tham gia.",
  "A manual schedule supports at most 12 participants":
    "Lịch thủ công chỉ hỗ trợ tối đa 12 người tham gia.",
  "Every participant must appear in exactly 4 matches":
    "Mỗi người tham gia phải xuất hiện đúng 4 trận.",
  "Participants cannot be scheduled for more than 4 matches":
    "Mỗi người tham gia không được xếp quá 4 trận.",
};

function translateApiMessage(message: string) {
  const normalizedMessage = message.trim();

  if (!normalizedMessage) {
    return "Đã xảy ra lỗi khi gọi API.";
  }

  if (EXACT_ERROR_TRANSLATIONS[normalizedMessage]) {
    return EXACT_ERROR_TRANSLATIONS[normalizedMessage];
  }

  const manualScheduleSizeMatch = normalizedMessage.match(
    /^A manual schedule with (\d+) participants must include exactly \1 matches$/,
  );
  if (manualScheduleSizeMatch) {
    return `Với ${manualScheduleSizeMatch[1]} người tham gia, lịch thủ công phải có đúng ${manualScheduleSizeMatch[1]} trận đấu.`;
  }

  const teamSizeMatch = normalizedMessage.match(
    /^Match (\d+) must contain exactly 2 players per team$/,
  );
  if (teamSizeMatch) {
    return `Trận ${teamSizeMatch[1]} phải có đúng 2 người chơi cho mỗi đội.`;
  }

  const playerCountMatch = normalizedMessage.match(
    /^Match (\d+) must contain exactly 4 players$/,
  );
  if (playerCountMatch) {
    return `Trận ${playerCountMatch[1]} phải có đúng 4 người chơi.`;
  }

  const duplicatePlayerMatch = normalizedMessage.match(
    /^A player cannot appear twice in match (\d+)$/,
  );
  if (duplicatePlayerMatch) {
    return `Một người chơi không thể xuất hiện 2 lần trong trận ${duplicatePlayerMatch[1]}.`;
  }

  const outsiderMatch = normalizedMessage.match(
    /^Match (\d+) includes a player outside the selected participants$/,
  );
  if (outsiderMatch) {
    return `Trận ${outsiderMatch[1]} có người chơi không nằm trong danh sách tham gia đã chọn.`;
  }

  const minLengthMatch = normalizedMessage.match(
    /^Too small: expected string to have >=(\d+) characters$/,
  );
  if (minLengthMatch) {
    return `Vui lòng nhập ít nhất ${minLengthMatch[1]} ký tự.`;
  }

  const maxLengthMatch = normalizedMessage.match(
    /^Too big: expected string to have <=(\d+) characters$/,
  );
  if (maxLengthMatch) {
    return `Vui lòng nhập không quá ${maxLengthMatch[1]} ký tự.`;
  }

  const minItemsMatch = normalizedMessage.match(
    /^Too small: expected array to have >=(\d+) items$/,
  );
  if (minItemsMatch) {
    return `Vui lòng chọn ít nhất ${minItemsMatch[1]} mục.`;
  }

  if (normalizedMessage === "Invalid email address") {
    return "Email không hợp lệ.";
  }

  if (/fetch|network/i.test(normalizedMessage)) {
    return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
  }

  return normalizedMessage;
}

function resolveApiErrorMessage(errorBody: ApiErrorBody | null) {
  const issueMessage = errorBody?.issues?.find((issue) => issue.message)?.message;
  return translateApiMessage(issueMessage ?? errorBody?.message ?? "Request failed");
}

function redirectToExpiredSessionLogin() {
  if (typeof window === "undefined") {
    return;
  }

  clearSession();

  if (window.location.pathname === "/login") {
    return;
  }

  window.location.replace("/login?reason=session-expired");
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}) {
  const {
    token,
    showGlobalLoading = true,
    showErrorModal = true,
    errorTitle,
    ...requestOptions
  } = options;
  const headers = new Headers(requestOptions.headers);

  if (!headers.has("Content-Type") && requestOptions.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const shouldTrackRequest = typeof window !== "undefined" && showGlobalLoading;

  if (shouldTrackRequest) {
    beginAppRequest();
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...requestOptions,
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null;
      const error = new ApiError(resolveApiErrorMessage(errorBody), response.status);
      const shouldLogoutForExpiredSession = Boolean(token) && response.status === 401;

      if (shouldLogoutForExpiredSession) {
        redirectToExpiredSessionLogin();
      }

      if (showErrorModal && !shouldLogoutForExpiredSession) {
        showApiErrorModal(error.message, errorTitle);
      }

      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (
      showErrorModal &&
      !(error instanceof ApiError) &&
      !(error instanceof DOMException && error.name === "AbortError")
    ) {
      showApiErrorModal(
        error instanceof Error
          ? translateApiMessage(error.message)
          : "Đã xảy ra lỗi khi gọi API.",
        errorTitle,
      );
    }

    throw error;
  } finally {
    if (shouldTrackRequest) {
      endAppRequest();
    }
  }
}
